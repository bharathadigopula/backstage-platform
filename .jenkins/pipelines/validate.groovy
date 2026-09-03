//==============================================================================
// BACKSTAGE REPOSITORY VALIDATION
//==============================================================================

@Library('jenkins-pipeline-templates@v1.4.0') _

repositoryValidationPipeline(
    githubRepository: 'bharathadigopula/backstage-platform',
    shellSearchPath: 'scripts',
    validationScript: 'scripts/validate-ci.sh',
    timeoutMinutes: 40
)